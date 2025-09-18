import os
import logging
import requests
from sqlalchemy import select, insert

from api.time import time
import db.models as models

logger = logging.getLogger("api.siwf_accounts")

class SIWFAccounts:
    base_url = os.environ.get("FREQUENCY_ACCOUNTS_GATEWAY_URI")

    @classmethod
    def get_uri(cls, context):
        try:
            account_api_url = f"{cls.base_url}/v2/accounts/siwf"
            # Construct the URL with necessary parameters
            account_api_url = (
                f"{account_api_url}"
                "?callbackUrl=odessa%3A%2F%2Flogin"
                "&credentials=VerifiedGraphKeyCredential"
                "&credentials=VerifiedEmailAddressCredential"
                "&credentials=VerifiedPhoneNumberCredential"
                "&permissions=dsnp.profile%40v1"
                "&permissions=dsnp.public-key-key-agreement%40v1"
                "&permissions=dsnp.public-follows%40v1"
                "&permissions=dsnp.private-follows%40v1"
                "&permissions=dsnp.private-connections%40v1"
            )

            # Make the GET request to the account API
            response = requests.get(account_api_url)
            response.raise_for_status()

            siwf_uri = response.json().get("redirectUrl")
            logger.info(f"siwfURI response: {siwf_uri}")
            if not siwf_uri:
                raise ValueError("No 'redirectUrl' found in the API response.")

            return siwf_uri

        except requests.exceptions.RequestException as e:
            logger.error(f"Error while fetching siwfURI: {e}")
            raise ValueError("Unable to retrieve siwfURI from account API.")

    @classmethod
    def login(cls, context, auth_code):
        try:
            account_api_url = f"{cls.base_url}/v2/accounts/siwf"
            payload = {
                "authorizationCode": auth_code,
            }
            logger.info(f"Posting to siwf login with payload: {payload}")
            response = requests.post(account_api_url, json=payload)
            response.raise_for_status()

            response_data = response.json()
            msa_id = response_data.get("msaId")
            control_key = response_data.get("controlKey")
            exists = False

            if msa_id:
                # Check if the Frequency user is already registered with Odessa
                conn = context["db-conn"]
                metadata_stmt = select(models.frequency_metadata).where(models.frequency_metadata.c.msa_id == msa_id)
                existing_metadata = conn.execute(metadata_stmt).fetchone()

                if existing_metadata:
                    logger.info(f"MSA ID already exists: {msa_id}")
                    exists = True

            logger.info(f"siwfLogin response: {response_data}")

            # If MSA ID is not found and the user needs to register with Odessa
            return {"success": True, "msaId": msa_id, "exists": exists, "controlKey": control_key}

        except requests.exceptions.RequestException as e:
            logger.error(f"Error while posting to siwf login: {e}")
            raise ValueError("Unable to complete the POST request to account API.")

    @classmethod
    def insert_frequency_metadata(cls, context, persona_id, msa_id):
        session = context["session"]
        try:
            stmt = insert(models.frequency_metadata).values(
                msa_id=msa_id,
                persona_id=persona_id,
                creation_time=time.utcnow()
            )
            session.execute(stmt)
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Error inserting frequency metadata for persona {persona_id}: {e}")
            raise ValueError(f"Unable to add frequency metadata for persona {persona_id}.")
        finally:
            session.close()

    @classmethod
    def get_msa_id(cls, context, control_key):
        account_api_url = f"{cls.base_url}/v1/accounts/account/{control_key}"
        try:
            response = requests.get(account_api_url)
            response.raise_for_status()

            response_data = response.json()
            msa_id = response_data.get("msaId")
            return {"msaId": msa_id}
        except requests.exceptions.HTTPError as http_err:
            if response.status_code == 404:
                logger.info(f"MSA ID not found for control key {control_key}: {http_err}")
                return {"msaId": None}
            else:
                logger.error(f"HTTP error while fetching MSA ID: {http_err}")
                raise ValueError("Unable to retrieve MSA ID from account API.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error while fetching MSA ID: {e}")
            raise ValueError("Unable to retrieve MSA ID from account API.")

    @classmethod
    def get_msa_handle_for_persona(cls, context, persona_id):
        session = context["session"]
        metadata_stmt = select(models.frequency_metadata.c.msa_id).where(models.frequency_metadata.c.persona_id == persona_id)
        result = session.execute(metadata_stmt).fetchone()

        msa_id = result.msa_id if result else None
        if msa_id:
            account_api_url = f"{cls.base_url}/v1/accounts/{msa_id}"
            try:
                response = requests.get(account_api_url)
                response.raise_for_status()

                response_data = response.json()
                return response_data.get("handle", {}).get("base_handle") 
            except requests.exceptions.RequestException as e:
                logger.error(f"Error while fetching MSA handle: {e}")
                raise ValueError("Unable to retrieve MSA handle from account API.")

        return None
