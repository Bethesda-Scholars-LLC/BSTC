# BSTC
This is the webhook integration between [Bethesda Scholars](https://www.bethesdascholars.com/) and [TutorCruncher](https://tutorcruncher.com/).

## Setup
Your project must have a `.env` with your integration secret key in the `API_KEY` field.
An example `.env` file would be:
```dotenv
API_KEY=738f2932aaba69529d1ba1c16f683c212c7178ea
EMAIL_PASSWORD=my_email_password
PERSONAL_EMAIL_ADDRESS=email@gmail.com
PERSONAL_EMAIL_FROM=Me
BUSINESS_EMAIL_ADDRESS=my@business.com
BUSINESS_EMAIL_FROM=My Business
TEST_EMAIL_ADDRESS=test@test.com
SIGNATURE_DESCRIPTION=Co-Founder and CEO at My Business Inc.

DB_NAME=my_db
DB_TEST_NAME=test
DB_URI=mongodb+srv://joe:momma@172.0.0.1/
```

## Development
Once you've created your .env, and installed dependencies with `npm install`, start your development server with:
```shell
npm start
```
## Documentation

The MongoDB databased used in this integration is used for storing client who are currently waiting on a tutor to set their availibility.

### Listeners

| Event Name                    | Action |
| ----------------------------- | ------ |
| `REQUESTED_A_SERVICE`         | Change job's name to only include tutors first name and last initial. And set job default location based on description. Moves client to New Client pipeline and sets client manager accordingly. Capitalizes school name properly. Sets job rate to $40 for elementary school tutoring. |
| `ADDED_CONTRACTOR_TO_SERVICE` | Change job's status to in progress, and move pipeline stage on client to availability not set. Also sets `looking_for_job` custom field to false. Sets custom pay rate to $28 for special tutors. Adds tutor/job to database if not already in there. Creates ad hoc payment for referral if tutor profile has referral code. Schedules mail to send to managment if tutor has not set availability in 24 hours. |
| `REMOVED_CONTRACTOR_FROM_SERVICE` | This removes the tutor from the jobs stored in database if there are any. |
 `CHANGED_CONTRACTOR_STATUS`    | Sets `looking_for_job` custom field to true when tutor is approved. Sets phone number, address, and capitalizes school when approved as well. Sends email with referral instructions and referral code when approved.|
 `ADD_LABEL_TO_SERVICE`         | Checks for first lesson complete and sends feedback email. Moves client down pipeline. |
 `MARKED_AN_APPOINTMENT_AS_COMPLETE` | Checks for first lesson complete and sends feedback email. Moves client down pipeline. |
`EDITED_AVAILABILITY`           | Removes tutor/service from the database if they are stored there. Sends email to client with tutor details. Deletes scheduled mail for email type `awaiting_availability` if one existed. Schedules mail that sends to client if they have not booked in 3 days. |
`APPLIED_FOR_SERVICE`           | Sets tutor `looking_for_job` field to true. |
`BOOKED_AN_APPOINTMENT`         | Checks if client is dormant and sends warning email if so. Adds client to `not_colds` schema in DB. Moves client to matched and booked pipeline if the client is in matched not booked and the job does not have first lesson complete label. Deletes scheduled mail for email type `awaiting_booking` if one existed. |
`CREATED_AN_APPOINTMENT`        | Moves client to matched and booked pipeline if the client is in matched not booked and the job does not have first lesson complete label. |
`TENDER_WAS_ACCEPTED`           | Does the same as `ADDED_CONTRACTOR_TO_SERVICE`. |
`CREATED_REPORT`                | Does the same as `ADDED_A_LABEL_TO_A_SERVICE`. |
`CHANGED_SERVICE_STATUS`        | If the status is cold and the job is in the `not_colds` schema, sends email to client if so. Deletes from job this schema. |
`CREATED_A_CONTRACTOR`          | Schedules mail to send to tutor in one day reminding them to put in bio. Deletes this email before sending if the bio is filled out. |