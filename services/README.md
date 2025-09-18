# Odessa Backend

## Development

Postgres + GraphQL + Python (Ariadne framework)

### If this is your first time accessing Odessa

Make sure to do the following in this directory to set up the PostgreSQL API:

- Create a virtual environment, enter it, and install `requirements.txt`
    - Example using venv (replace anything inside <>):
    ```
    python3 -m venv <NAME-OF-VENV>
    source <NAME-OF-VENV>/bin/activate
    pip install -r requirements.txt
    ```
- Create a `credentials/` directory
- Download "Odessa Firebase Credentials" from 1Password and add to the `credentials/` directory you just created
- Copy `.env.template` to `.env`, uncomment out `AUDIO_ASSET_PATH` and `IMAGE_ASSET_PATH`, add `{your-name}/` after `dev/` , and make sure both variables start with `/`
    - Those two lines should look like (replace anything inside <>):
    ```
    AUDIO_ASSET_PATH = "/assets/dev/<YOUR-NAME>/audio"
    IMAGE_ASSET_PATH = "/assets/dev/<YOUR-NAME>/image"
    ```
- With Docker desktop open in the background, run:
```
cd db
docker compose up -d
```
- Once the container is up, to set alembic up for the database, run:
```
alembic upgrade head
```
- In the `tasks/` directory, to add dev data to the database, run:
```
invoke psql
invoke seed-dev-data
```

You're now ready to follow the steps in the `OdessaApp/` directory to run the application.

### Dependencies

We keep the `requirements.txt` file in sync by using
[pip-tools](https://readthedocs.org/projects/pip-tools/):

```
$ pip install pip-tools
```

pip-tools has you maintain direct dependencies in `requirements.in`,
and then running `pip-compile` will generate a `requirements.txt` file
for you. This is very similar to the `.lock` files from Javascript and
Rust.

```
# add some dependency to requirements.in
$ pip-compile
...
# install new libraries and uninstall things not needed
$ pip-sync
```

### DotEnv Configuration

We use python-dotenv and require that a `.env` file is set up. You can
copy `.env.template` to `.env` and edit the values as needed. Secrets
can usually be found in 1pw. We `.gitignore` dotenv files.

If you want to build the production Lambda bundle, you will need a
production `.env.production` file with appropriate secret information
filled in. See deployment section below.

AWS credentials may or may not need to be filled in. We let boto3 do
its thing, so this means that you can use
`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` or `AWS_PROFILE`. In
production, we've configured the Lambda environment to execute with an
assumed role, so there is no need to have any AWS credentials in
`.env.production` at all.

### GraphQL & Adding Models

Suppose you would like to add a new kind of database entity, say
reaction (like, thumbs up, etc) object. There are three places this
must be done:

1. As a new database table. Create a new model in `db/models.py`, then
   have [Alembic autogenerate a schema
   migration](https://alembic.sqlalchemy.org/en/latest/autogenerate.html)
   for you. You may want to insert sample dev data in the
   `seed-dev-data` task in `tasks.py`.

2. Likely you'll want to expose the new entity via GraphQL to the
   client. This is done by modifying `api/type_defs.graphql`.

3. If you add a new GraphQL type def, you'll also need to generate
   corresponding resolvers. These are in `api/resolvers/`. The root query
   resolver is in `api/query.py`.

### GraphQL Playground

The GQL Playground provides a simple way to access the API:

1. Start the server
2. Go to http://localhost:8000/graphql/
3. Add headers. E.g.
```
{
  "persona-pkh": [GET FROM PSQL],
  "Odessa-Disable-Auth": "true"
}
```
4. Run a query. E.g.
```
query {
  community(id: 1) {
    id
    name
    description
    members {
      id
      name
    }
    active_prompt {
      id
      status
    }
    active_round {
      id
      status
    }
  }
}
```

### Audio Processing

We rely heavily on ffmpeg for audio processing. You will need this
somewhere in your executable path on your system. ffmpeg is readily
available on Linux systems and through Homebrew on OS X.

[Here](https://medium.com/@jud.dagnall/dynamic-range-compression-for-audio-with-ffmpeg-and-compand-621fe2b1a892)
is a good piece on range compression and waveform generation.

We install ffmpeg into the lambda function for deployment.

## Deployment

The `Makefile` in this directory builds and deploys the Python code as
a Lambda function via a Docker imgae. Available commands:

- `make build` -- builds the docker image
- `make push` -- pushes the image into the Odessa ECR
- `make update` -- triggers a lambda function update
- `make clean` -- deletes the `build/` and `cache/` directories, and
  untags the Docker image locally. You generally don't have to run
  this. In fact it actually imposes an extra Docker layer uploading
  cost.
- `make api-logs` -- tails the logs of the api deployment. You can see
  app output here from web requests.
- `make worker-logs` -- tails the logs of the worker deployment. You
  can see app output here from scheduled minutely triggers.
- `make new-post-worker-logs` -- tails the logs of the new-post-worker
  deployment. You can see app output here from new-post-based triggers.

In order for `make build` to work properly, it needs a
`.env.production` file with correct secrets pulled from 1pw.

## Debug Tab

This tab is intended for development and debbuging purposes. It is available in production and development environments, it gives access to full control of a community with all permissions available. Access to tab is based in a simple password set in `debugPassword` in file `services/api/query.py`.

### Displaying tab in Development

For development purposes set in `OdessaApp/.env` file, the following flag:

```
DEBUG_TAB=true
```

### Displaying tab in Production

Additionally, those personas with membership in community with id `-1` have access to it when opening the app. SQL command:

```
insert into memberships (persona_id, community_id)  values (persona.id, -1)
```

Notes:

- WARNING: `debugPassword`'s security can and should be increased, for example by checking access auth in the backend instead of in the frontend as is now. We'll assume good faith for now in that users aren't trying to hack us.
- Note that if you get the password wrong you'll need to close and open the app again to be prompted again with the password input box.

## Flags

Odessa allows to set community-level flags. These are defined in `services/api/resolvers/flags.py`.

These help set flags for both the frontend and backend to authorize access to features within that community.

Flags that are deemed stable features are flagged in `basal_flags`. Experimental flags are defined in `development_flags`. We imagine a natural flow between `development_flags` to `basal_flags` as experimental features become baseline for Odessa. At the same time, we may want to deploy some feature solely for some communities, in which case, some flags will remain in `development_flags`.

Add and remove flags by invoking tasks

```
$ invoke add-community-flag --help
$ invoke remove-community-flag --help
```

## Roles and Permissions

Our framework of permissions works at two levels, which are currently all asigned in a per-community basis and are associated to a `membership_id`:

Add and remove roles and permissions by invoking tasks

```
$ invoke set-community-role --help
$ invoke set-community-perm --help
```

### Roles

Designed to flag a persona's role in a community. Registered in DB Table `community_roles`.

Defined as an Enumeration in `services/db/models.py` with the following roles availabe ('owner', 'moderator', 'trustee', 'facilitator').

Each role grants a preceding explicitly defined set of permissions as defined in `services/api/resolvers/permissions.py`

### Permissions

Designed to flag specific permissions for a persona in a community. Registered in DB Table `permissions`, which are applied as _patches_–with a `mode` ( grant | revoke )–on top of the roles assigned to a persona.

### Persona's permissions

- persona.**user_perm_basal**(community) returns a list of permissions from the perms list defined in file permissions.py for all the persona's roles as assigned in DB Table community_roles.

- persona.**user_perm_patches**(community) returns a list of permissions patches from DB Table permissions.

- persona.**user_permissions**(community) returns the persona's list of persmissions, by applying patches in **user_perm_patches** to **user_perm_basal**.

## Actions Tab

This tab is intended for community members to exercise their roles and permissions for actions within a community.
