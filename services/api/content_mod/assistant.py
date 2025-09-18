import os
from openai import OpenAI
from dotenv import load_dotenv
import logging

logger = logging.getLogger("api.mod_assistant")

load_dotenv()


CONTENT_POLICY = """
1. Determine if the text meets any of the encouraged behavriors in this list: {encourage_behav_list} . If it does, list which of these behaviors it meets. If the list is empty skip this task. Do not provide with hypotheticals.

2. The following are behaviors or content to prohibit, understand them as restrictive, and flag it if one of these is violated: {ban_behav_list}.  If the list is empty skip this task. If it does, list which of these behaviors meets and recommend to ban. Do not provide with hypotheticals.

The reply must be format as follows, and no other format is allowed:

Encouraged behaviors:
    >> <list item 1> | <yes / no> | <explanation>
    >> <list item 2> | <yes / no> |  <explanation>
    >> <list item 3> | <yes / no> |  <explanation>
Violation behaviors:
    >> <list item 1> | <yes / no> |  <explanation>
    >> <list item 2> | <yes / no> |  <explanation>
    >> <list item 3> | <yes / no> |  <explanation>
"""


def parse_as_dict(f):
    keywords = ["Encouraged behaviors", "Violation behaviors"]

    def process_flags(values):
        response = {}
        flags = values.split(">> ")
        if len(flags) == 2 and flags[1].startswith("None"):
            return response
        for flag in flags[1:]:
            flag_split = flag.split(" | ")
            if len(flag_split) != 3:
                continue
            key, binary, exp = flag_split
            binary = binary.lower().strip().strip("<>").strip()
            if binary == "yes":
                response[key] = exp.strip().strip("\n")
        return response

    # TODO(bcsaldias): make it a simpler format. Test in jupyter notebook.
    def is_valid(response):
        parsed = {}
        for i in range(len(keywords)):
            key = keywords[len(keywords) - i - 1]
            if key not in response and key == "Violation behaviors":
                options = ["Toxic behaviors", "Violations behaviors"]
                for opt in options:
                    if opt in response:
                        response = response.replace(opt, key)
            if key not in response:
                continue
            try:
                _response, _value = response.split(key)
                value = _value.strip(": ").strip()
                response = _response.replace(key, "").strip()
                parsed[key] = process_flags(value)
            except Exception as error:
                parsed[key] = {"Error": str(error)}
                logger.info(response)
                logger.error(parsed)
                return False
        return parsed

    def wrapper(*args, **kargs):
        response = f(*args, **kargs)
        parsed = is_valid(response)
        for i in range(10):
            if not parsed:
                parsed = is_valid(response)
        if parsed:
            return parsed
        return {}

    return wrapper


@parse_as_dict
def get_basic_behav_review(behaviors, content):
    try:
        client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

        logger.info(f""" behaviors["ban"] {behaviors["ban"]} """)

        messages = [
            {
                "role": "system",
                "content": CONTENT_POLICY.format(
                    encourage_behav_list=behaviors["encourage"],
                    ban_behav_list=behaviors["ban"],
                ),
            },
            {"role": "user", "content": content},
        ]

        # logger.info(f"messages {messages}")

        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
        )

        content = response.choices[0].message.content
        logger.info(f"content {content}")

        return content

    except Exception as error:
        return f"""
                Encouraged behaviors:
                    >> Error | no | {error}
                Violation behaviors:
                    >> Error | no | {error}
                """
