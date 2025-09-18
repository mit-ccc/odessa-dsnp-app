from api.content_mod.resolvers import Disputes
from api.resolvers import Communities
from invoke import task
from tasks_admin import with_db_context


@task
def list_all_disputes(c, verbose):
    pass


@task
def list_community_disputes(c, cid=None, verbose=False):
    print(f"\n>>> $ list-community-disputes -c {cid}")
    handle_list_disputes(cid, verbose)
    # print(response)


@with_db_context
def handle_list_disputes(context, cid, verbose):
    community = Communities.get(context, id=cid)
    disputes = Disputes(context, community=community).all()
    for d in disputes:
        print(d)
    return disputes
