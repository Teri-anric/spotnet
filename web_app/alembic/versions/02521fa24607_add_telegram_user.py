"""add telegram user

Revision ID: 02521fa24607
Revises: e69320e12cc7
Create Date: 2024-10-26 23:19:46.667437

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "02521fa24607"
down_revision = "e69320e12cc7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index("ix_user_wallet_id", table_name="user")
    op.create_index(op.f("ix_user_wallet_id"), "user", ["wallet_id"], unique=True)
    op.create_table(
        "telegram_user",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("telegram_id", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=True),
        sa.Column("first_name", sa.String(), nullable=True),
        sa.Column("last_name", sa.String(), nullable=True),
        sa.Column("wallet_id", sa.String(), nullable=True),
        sa.Column("photo_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["wallet_id"],
            ["user.wallet_id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_telegram_user_telegram_id"),
        "telegram_user",
        ["telegram_id"],
        unique=True,
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_telegram_user_telegram_id"), table_name="telegram_user")
    op.drop_table("telegram_user")
    op.drop_index(op.f("ix_user_wallet_id"), table_name="user")
    op.create_index("ix_user_wallet_id", "user", ["wallet_id"], unique=False)
    # ### end Alembic commands ###