# BSTC
This is the webhook integration between [Bethesda Scholars](https://www.bethesdascholars.com/) and [TutorCruncher](https://tutorcruncher.com/).

## Setup
You must include a `.env` in the root directory of this project.

Here's an example of what it might look like:

```dotenv
API_KEY=738f2932aaba69529d1ba1c16f683c212c7178ea
EMAIL_PASSWORD=my_email_password
PERSONAL_EMAIL_ADDRESS=email@gmail.com
PERSONAL_EMAIL_FROM=Me
BUSINESS_EMAIL_ADDRESS=my@business.com
BUSINESS_EMAIL_FROM=My Business
TEST_EMAIL_ADDRESS=test@test.com
SIGNATURE_DESCRIPTION=Co-Founder and CEO at My Business Inc.
PORT=80

DB_NAME=my_db
DB_TEST_NAME=test
DB_URI=mongodb+srv://joe:momma@172.0.0.1/
```

## Development
Once you've created your .env, and installed dependencies with `npm i`, start your development server with:
```bash
npm start
```

### Running Locally
To run and test hooks locally:
1. Set up port forwarding to receive webhooks on wifi
2. Turn off BSTC integration in TC API settings
3. Turn on BSTC test integration
4. `npm start` locally

### Accessing AWS EC2 Instance
1. login to AWS
2. click on EC2
3. click on instances
4. click on the instance id

### Stopping the Server
PM2 is a command line utility that lets us schedule processes to be restarted when the crash. If the server falls into an infinite loop of trying to restart, you can stop the server by running the following in your terminal:
1. `ssh bstc`
2. `sudo stop bstc`

### Starting the Server
1. The easiest way to start the server is to push to the master branch. Jenkins will deploy this branch automatically to the server
2. If this does not work, log into Jenkins at http://tc.bethesdascholars.com:8080 and navigate to BSTC. Then click "Build Now" to start the build
3. Last option is manually restarting through AWS:
  a. `ssh bstc`
  b. `cd /var/lib/jenkins/workspace/BSTC`
  c. `do ./build.sh`

## Documentation

### Manager Transition
All the steps for transitions between managers can be found here: https://docs.google.com/document/d/1Ho0omnMopqdi1EI6uxW2LRXPn60rhJwCBa2fYh8quQA/edit

### Clearing DB Collection
To clear a collection in the `bstc` mongo database:
1. Open mongo DB compass and open the terminal at the bottom of the app
2. run `use bstc`
3. run `db.not_colds.deleteMany({})` to delete all documents in `not_colds` collection

### Syncing All Contractors with DB
To sync all contractors from TutorCruncher with MangoDB:
1. Mark test webhook as active (not webhook active)
2. start server locally on the test webhook
3. change `RUN_SCRIPTS` variable to `true` on line 11 in `utils.ts`
5. uncomment line 55 in `syncDB.ts`

### Adding Environment Variables to EC2 Instance
Do this before pushing changes using the environment variables to the Github repository
1. add environment variable to `.env` file locally and to `requiredEnvs` variable in `util.ts` on line 60
2. `ssh bstc`
3. `cd /var/lib/jenkins/workspace/BSTC`
4. `sudo nano .env` to access the .env file

### Viewing Logs Locally
To view AWS console logs from terminal:
1. `ssh bstc`
2. `sudo pm2 log 0`
3. `sudo cat` followed by terminal output for console out or error

### Running Scripts
Important Note: Scripts will run on the production db, not dev db
1. Turn on the testing hook as active (not webhook active)
2. write new scripts in `scripts.ts`
3. change `RUN_SCRIPTS` variable to `true` on line 11 in `utils.ts`
4. call new scripts at bottom of the file in an async function

### Adding Recruiters
Currently recruiters are paid $20 for referrals while all other tutors are paid $15. To change this, add recruiters and customize their referral payment in `contractor.ts`:
1. add recruiters to `recruiterIds` variable
2. in webhook `CHANGED_CONTRACTOR_STATUS` add logic after line 238

### Adding Screeners
Currently screeners are paid $17.5 for screening a tutor. Add more/update screeners in `contractor.ts` **Screeners must have a contractor account on TutorCruncher.**
1. add screeners to `screeners` variable
2. change pay using `screeningRate` variable 
3. in webhook `CHANGED_CONTRACTOR_STATUS` add logic

### Adding Exempt Clients
Currently there are 12 clients exempt from extra lesson fees including in person fees, higher level subject fees, etc. These clients will only be charged $45 regardless of their tutoring request (except test prep). To change this, modify `service.ts`:
1. add to `exemptClients` variable
2. any logic changes must be made in `setJobRate()` on line 156

### Listeners

| Event Name                          | Action |
| -----------------------------       | ------ |
| `REQUESTED_A_SERVICE`               | Change job's name to only include tutors first name and last initial. And set job default location based on description. Moves client to New Client pipeline and sets client manager accordingly. Capitalizes school name properly. Sets job rate to $40 for elementary school tutoring. |
| `ADDED_CONTRACTOR_TO_SERVICE`       | Change job's status to in progress, and move pipeline stage on client to availability not set. Also sets `looking_for_job` custom field to false. Sets custom pay rate to $28 for special tutors. Adds tutor/job to database if not already in there. Creates ad hoc payment for referral if tutor profile has referral code. Schedules mail to send to managment if tutor has not set availability in 24 hours. |
| `REMOVED_CONTRACTOR_FROM_SERVICE`   | This removes the tutor from the jobs stored in database if there are any. |
| `CHANGED_CONTRACTOR_STATUS`         | Sets `looking_for_job` custom field to true when tutor is approved. Sets phone number, address, and capitalizes school when approved as well. Sends email with referral instructions and referral code when approved. Adds ad hoc payment for screener when screener changes contractor status. |
| `ADD_LABEL_TO_SERVICE`              | Checks for first lesson complete and sends feedback email. Moves client down pipeline. |
| `MARKED_AN_APPOINTMENT_AS_COMPLETE` | Checks for first lesson complete and sends feedback email. Moves client down pipeline. |
| `EDITED_AVAILABILITY`               | Removes tutor/service from the database if they are stored there. Sends email to client with tutor details. Deletes scheduled mail for email type `awaiting_availability` if one existed. Schedules mail that sends to client if they have not booked in 3 days. |
| `APPLIED_FOR_SERVICE`               | Sets tutor `looking_for_job` field to true. |
| `BOOKED_AN_APPOINTMENT`             | Checks if client is dormant and sends warning email if so. Adds client to `not_colds` schema in DB. Moves client to matched and booked pipeline if the client is in matched not booked and the job does not have first lesson complete label. Deletes scheduled mail for email type `awaiting_booking` if one existed. |
| `CREATED_AN_APPOINTMENT`            | Moves client to matched and booked pipeline if the client is in matched not booked and the job does not have first lesson complete label. |
| `TENDER_WAS_ACCEPTED`               | Does the same as `ADDED_CONTRACTOR_TO_SERVICE`. |
| `CREATED_REPORT`                    | Does the same as `ADDED_A_LABEL_TO_A_SERVICE`. |
| `CHANGED_SERVICE_STATUS`            | If the status is cold and the job is in the `not_colds` schema, sends email to client if so. Deletes from job this schema. |
| `CREATED_A_CONTRACTOR`              | Schedules mail to send to tutor in one day reminding them to put in bio. Deletes this email before sending if the bio is filled out. |
