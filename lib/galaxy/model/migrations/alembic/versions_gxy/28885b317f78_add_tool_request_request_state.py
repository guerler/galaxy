"""Add tool_request.request_state.

Records the validity of the captured ``request`` payload — ``not_validated``,
``validated``, or ``validation_failed``. Distinct from ``state``, which tracks
the async-submission lifecycle. Set whenever a ToolRequest is minted (async
API or workflow tool step capture).

Additive and nullable; no backfill.

Revision ID: 28885b317f78
Revises: 6925fe4c8a17
Create Date: 2026-05-21 12:30:00.000000

"""

from sqlalchemy import (
    Column,
    String,
)

from galaxy.model.migrations.util import (
    add_column,
    drop_column,
    transaction,
)

# revision identifiers, used by Alembic.
revision = "28885b317f78"
down_revision = "6925fe4c8a17"
branch_labels = None
depends_on = None

table_name = "tool_request"


def upgrade():
    with transaction():
        add_column(table_name, Column("request_state", String(32)))


def downgrade():
    with transaction():
        drop_column(table_name, "request_state")
