from api.content_mod.resolvers.disputes import Dispute, Disputes
from api.content_mod.resolvers.reviews import Review, Reviews

"""
  Defining content moderation resolvers and tools here for less coupling more cohesion.
"""

# Linting complains about unused imports if you don't explicitly list them below
__all__ = ["Dispute", "Disputes", "Review", "Reviews"]
