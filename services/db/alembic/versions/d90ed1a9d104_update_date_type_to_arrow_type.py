"""Update Date type to Arrow type

Revision ID: d90ed1a9d104
Revises: 4baa5f35aad5
Create Date: 2023-12-07 17:10:17.538865

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy_utils import ArrowType


# revision identifiers, used by Alembic.
revision: str = "d90ed1a9d104"
down_revision: Union[str, None] = "4baa5f35aad5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "posts", "creation_time", type_=ArrowType, existing_type=sa.DateTime
    )
    op.alter_column(
        "audios", "creation_time", type_=ArrowType, existing_type=sa.DateTime
    )
    op.alter_column(
        "images", "creation_time", type_=ArrowType, existing_type=sa.DateTime
    )
    op.alter_column(
        "rounds", "creation_time", type_=ArrowType, existing_type=sa.DateTime
    )
    op.alter_column("rounds", "start_time", type_=ArrowType, existing_type=sa.DateTime)
    op.alter_column(
        "rounds", "completion_time", type_=ArrowType, existing_type=sa.DateTime
    )
    op.alter_column("rounds", "end_time", type_=ArrowType, existing_type=sa.DateTime)


def downgrade() -> None:
    op.alter_column(
        "posts", "creation_time", type_=sa.DateTime, existing_type=ArrowType
    )
    op.alter_column(
        "audios", "creation_time", type_=sa.DateTime, existing_type=ArrowType
    )
    op.alter_column(
        "images", "creation_time", type_=sa.DateTime, existing_type=ArrowType
    )
    op.alter_column(
        "rounds", "creation_time", type_=sa.DateTime, existing_type=ArrowType
    )
    op.alter_column("rounds", "start_time", type_=sa.DateTime, existing_type=ArrowType)
    op.alter_column(
        "rounds", "completion_time", type_=sa.DateTime, existing_type=ArrowType
    )
    op.alter_column("rounds", "end_time", type_=sa.DateTime, existing_type=ArrowType)
