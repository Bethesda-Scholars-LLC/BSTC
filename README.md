# BSTC
This is the webhook integration between [Bethesda Scholars](https://www.bethesdascholars.com/) and [TutorCruncher](https://tutorcruncher.com/).


## Listeners

1. On, `REQUESTED_A_SERVICE` change job's name to only include the tutors first_name 
and last_initial. Also set default location based on description
2. On, `ADDED_CONTRACTOR_TO_SERVICE` change job's status to in progress, and move pipeline stage 
on client to matched not booked
