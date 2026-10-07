from app import scheduler
from app import stats_history

scheduler.add_job(stats_history.snapshot, 'interval', seconds=60, coalesce=True, max_instances=1)
