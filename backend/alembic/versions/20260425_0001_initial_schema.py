"""Initial PostgreSQL schema

Revision ID: 20260425_0001
Revises:
Create Date: 2026-04-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260425_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "areas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_areas_code"), "areas", ["code"], unique=True)
    op.create_index(op.f("ix_areas_id"), "areas", ["id"], unique=False)

    op.create_table(
        "alert_subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("region_code", sa.String(length=32), nullable=False),
        sa.Column("min_risk_level", sa.String(length=32), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alert_subscriptions_id"), "alert_subscriptions", ["id"], unique=False)
    op.create_index(op.f("ix_alert_subscriptions_region_code"), "alert_subscriptions", ["region_code"], unique=False)

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("area_id", sa.Integer(), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["area_id"], ["areas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alerts_area_id"), "alerts", ["area_id"], unique=False)
    op.create_index(op.f("ix_alerts_created_at"), "alerts", ["created_at"], unique=False)
    op.create_index(op.f("ix_alerts_id"), "alerts", ["id"], unique=False)
    op.create_index(op.f("ix_alerts_severity"), "alerts", ["severity"], unique=False)
    op.create_index(op.f("ix_alerts_status"), "alerts", ["status"], unique=False)

    op.create_table(
        "risk_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("area_id", sa.Integer(), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(length=32), nullable=False),
        sa.Column("recorded_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["area_id"], ["areas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_risk_snapshots_area_id"), "risk_snapshots", ["area_id"], unique=False)
    op.create_index(op.f("ix_risk_snapshots_id"), "risk_snapshots", ["id"], unique=False)
    op.create_index(op.f("ix_risk_snapshots_recorded_at"), "risk_snapshots", ["recorded_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_risk_snapshots_recorded_at"), table_name="risk_snapshots")
    op.drop_index(op.f("ix_risk_snapshots_id"), table_name="risk_snapshots")
    op.drop_index(op.f("ix_risk_snapshots_area_id"), table_name="risk_snapshots")
    op.drop_table("risk_snapshots")

    op.drop_index(op.f("ix_alerts_status"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_severity"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_id"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_created_at"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_area_id"), table_name="alerts")
    op.drop_table("alerts")

    op.drop_index(op.f("ix_alert_subscriptions_region_code"), table_name="alert_subscriptions")
    op.drop_index(op.f("ix_alert_subscriptions_id"), table_name="alert_subscriptions")
    op.drop_table("alert_subscriptions")

    op.drop_index(op.f("ix_areas_id"), table_name="areas")
    op.drop_index(op.f("ix_areas_code"), table_name="areas")
    op.drop_table("areas")
