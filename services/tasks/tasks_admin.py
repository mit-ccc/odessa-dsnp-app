import os

import sqlalchemy
from sqlalchemy.orm import sessionmaker
from invoke import task
from dotenv import load_dotenv

from api.resolvers.permissions import Permissions
from api.resolvers import Personas, Communities

load_dotenv()

engine_name = f"postgresql+psycopg2://{os.environ['DB_CONNECTION_STRING']}"

######################################################################
#####################   Community-level tasks   ######################
######################################################################


@task
def create_community(
    c,
    name="",
    description="",
    cid=None,
    access="private",
    metadata="",
    members_desc="",
    verbose=False,
):
    """
    Creates community. By default access='private'

    Example:
        invoke create-community -n STR -d STR -c INT -a STR -v
    """
    assert access in ["private", "public"]
    assert len(name) > 0, "name can't be empty"
    assert len(description) > 0, "description can't be empty"
    if verbose:
        print(
            f"\n>>> $ invoke create-community -n `{name}` -d `{description}` -c {cid}"
        )
    response = handle_create_community(
        name, description, cid, access, metadata, members_desc, verbose
    )
    print(f"created community with id {response}")


@task
def add_community_member(c, cid=None, pid=None, verbose=False):
    """
    Add member to community.

    Example:
        invoke add-community-member -c INT -p INT -v
    """
    if verbose:
        print(f"\n>>> $ add-community-member -c {cid} -p {pid}")
    response = handle_add_community_member(cid, pid, verbose)
    print(response)


@task
def add_community_flag(c, cid=None, label="", verbose=False):
    """
    Add flag to community.

    Example:
        invoke add-community-flag -c INT -l STR -v
    """
    if verbose:
        print(f"\n>>> $ add-community-flag -c {cid} -l {label}")
    response = handle_add_community_flag(cid, label, verbose)
    print(response)


@task
def remove_community_flag(c, cid=None, label="", verbose=False):
    """
    Remove flag from community.

    Example:
        invoke remove-community-flag -c INT -l STR -v
    """
    if verbose:
        print(f"\n>>> $ add-community-flag -c {cid} -l {label}")
    response = handle_remove_community_flag(cid, label, verbose)
    print(response)


######################################################################
#################   Manage roles and permissions     #################
######################################################################

big_int = 10**100

available_roles = list(Permissions.metadata["roles"].keys())  # [:-2]
available_perms = Permissions.metadata["permissions"]
membership_role_help = {
    "cid": "community_id",
    "pid": "persona_id",
    "label": "role",
    "mode": "add|remove",
    "verbose": "verbose",
}
membership_perm_help = {
    "cid": "community_id",
    "pid": "persona_id",
    "label": "permission",
    "mode": "grant|revoke",
    "verbose": "verbose",
}


@task(help=membership_role_help)
def set_community_role(c, cid=big_int, pid=big_int, label="", mode="", verbose=False):
    """
    add or remove role for person in community.

    Example:
        invoke set-community-role -p INT -c INT -l STRING -m add|remove -v
    """
    if verbose:
        print(
            f"\n>>> $ invoke set-community-role -p {pid} -c {cid} -l {label} -m {mode}"
        )
    check_params(cid, pid, label, mode, ["add", "remove"], label, available_roles)
    response = handle_role(cid, pid, label, mode, verbose)
    print(response)


@task(help=membership_perm_help)
def set_community_perm(c, cid=big_int, pid=big_int, label="", mode="", verbose=False):
    """
    grant or revoke permission to person within community.

    Example:
        invoke set-community-perm -p INT -c INT -l STRING -m grant|revoke -v
    """
    if verbose:
        print(
            f"\n>>> $ invoke set-community-perm -p {pid} -c {cid} -l {label} -m {mode}"
        )
    check_params(cid, pid, label, mode, ["grant", "revoke"], label, available_perms)
    response = handle_permission(cid, pid, label, mode, verbose)
    print(response)


def check_params(a, b, c, d, e, f, g):
    assert a < big_int, "community_id too big"
    assert b < big_int, "persona_id too big"
    assert len(c) > 0, "string can't be empty"
    assert d in e, f"mode must be in {e}"
    assert f in g, f"{f} not available. Choose from {g}."


######################################################################
#################   Interaction with models and DB   #################
######################################################################


def with_db_context(func):
    def setup():
        engine = sqlalchemy.create_engine(engine_name)
        context = {}
        context["db-conn"] = engine.connect()
        Session = sessionmaker()
        Session.configure(bind=engine)
        context["session"] = Session()
        return context

    def teardown(context):
        context["db-conn"].commit()
        del context["db-conn"]
        del context["session"]

    def execute(*args, **kargs):
        context = setup()
        output = func(context, *args, **kargs)
        teardown(context)
        return output

    return execute


@with_db_context
def handle_permission(context, cid, pid, perm, mode, verbose):
    persona = Personas.get(context, persona_id=pid)
    if verbose:
        print(persona)
    community = Communities.get(context, id=cid)
    if verbose:
        print(community)
        print(persona.user_perm_status(community, perm))
    response = community.handle_permission(persona, perm, mode)
    if verbose:
        print(persona.user_perm_status(community, perm))
    return response


@with_db_context
def handle_role(context, cid, pid, role, mode, verbose):
    persona = Personas.get(context, persona_id=pid)
    if verbose:
        print(persona)
    community = Communities.get(context, id=cid)
    if verbose:
        print(community)
        print(persona.role_in_community(community))
    response = community.handle_role(persona, role, mode)
    if verbose:
        print(persona.role_in_community(community))
    return response


@with_db_context
def handle_create_community(
    context, name, description, cid, access, metadata, members_desc, verbose
):
    values = {
        "name": name,
        "description": description,
        "access": access,
        "metadata": metadata,
        "members_desc": members_desc,
    }
    if cid is not None:
        values["id"] = cid
    new_id = Communities.create(context, **values)
    return new_id


@with_db_context
def handle_add_community_member(context, cid, pid, verbose):
    persona = Personas.get(context, persona_id=pid)
    if verbose:
        print(persona)
    community = Communities.get(context, id=cid)
    if verbose:
        print(community)
    response = persona.join_community(community)
    return response


@with_db_context
def handle_add_community_flag(context, cid, label, verbose):
    community = Communities.get(context, id=cid)
    if verbose:
        print("initial flags", community.flags)
    response = community.add_flag(label)
    if verbose:
        print("final flags", community.flags)
    return response


@with_db_context
def handle_remove_community_flag(context, cid, label, verbose):
    community = Communities.get(context, id=cid)
    if verbose:
        print("initial flags", community.flags)
    response = community.remove_flag(label)
    if verbose:
        print("final flags", community.flags)
    return response
