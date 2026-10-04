from app import scheduler
from app.subscription import external_sources

# each source has its own interval; this only checks which ones are due
scheduler.add_job(external_sources.refresh_due, 'interval', minutes=1,
                  coalesce=True, max_instances=1)
