from app import scheduler
from app.xray import online
from config import JOB_RECORD_ONLINE_IPS_INTERVAL

scheduler.add_job(online.refresh, 'interval',
                  seconds=JOB_RECORD_ONLINE_IPS_INTERVAL,
                  coalesce=True, max_instances=1)
