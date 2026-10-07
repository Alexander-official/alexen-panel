from app import activity, scheduler

scheduler.add_job(activity.cleanup, 'interval', hours=6, coalesce=True, max_instances=1)
