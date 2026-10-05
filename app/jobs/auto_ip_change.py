from app import scheduler
from app.xray import auto_change

scheduler.add_job(auto_change.check, 'interval', seconds=5, coalesce=True, max_instances=1)
