"""Added Prompt.status constrints and other constraints

Revision ID: 7f70611c5fa9
Revises: 18e202334448
Create Date: 2023-12-12 23:24:10.736274

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision: str = "7f70611c5fa9"
down_revision: Union[str, None] = "18e202334448"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Prompt.status is now an Enumeration. Round.status represents active state.
    prompts = table("prompts", column("status", sa.String))
    deprecated_status = (op.inline_literal("active"), op.inline_literal("complete"))
    incoming_status = op.inline_literal("used")
    op.execute(
        prompts.update()
        .where(prompts.c.status.in_(deprecated_status))
        .values({"status": incoming_status})
    )
    op.alter_column(
        "prompts",
        "status",
        existing_type=sa.String(),
        type_=sa.Enum("eligible", "used", "removed", native_enum=False),
    )


def downgrade() -> None:
    op.alter_column("prompts", "status", type_=sa.String(), existing_type=sa.Enum)
