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
| `ADDED_CONTRACTOR_TO_SERVICE` | Change job's status to in progress, and move pipeline stage on client to matched not booked. Also sets `looking_for_job` custom field to false. Sets custom pay rate to $28 for special tutors. Adds tutor/job to database if not already in there. Creates ad hoc payment for referral if tutor profile has referral code. |
| `REMOVED_CONTRACTOR_FROM_SERVICE` | This removes the tutor from the jobs stored in database if there are any. |
 `CHANGED_CONTRACTOR_STATUS`    | Sets `looking_for_job` custom field to true when tutor is approved. Sets phone number, address, and capitalizes school when approved as well. Sends email with referral instructions and referral code when approved.|
 `ADD_LABEL_TO_SERVICE`         | Checks for first lesson complete and sends feedback email. Moves client down pipeline. |
 `MARKED_AN_APPOINTMENT_AS_COMPLETE` | Checks for first lesson complete and sends feedback email. Moves client down pipeline. |
`EDITED_AVAILABILITY`           | Removes tutor/service from the database if they are stored there. Sends email to client with tutor details. |
`APPLIED_FOR_SERVICE`           | Sets tutor `looking_for_job` field to true. |

