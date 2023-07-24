# BSTC
This is the webhook integration between [Bethesda Scholars](https://www.bethesdascholars.com/) and [TutorCruncher](https://tutorcruncher.com/).

## Setup
Your project must have a `.env` with your integration secret key in the `API_KEY` field.
An example `.env` file would be:
```dotenv
API_KEY=738f2932aaba69529d1ba1c16f683c212c7178ea
```

## Development
Once you've created your .env, and installed dependencies with `npm install`, start your development server with:
```shell
npm start
```
## Documentation

### Listeners

| Event Name                    | Action |
| ----------------------------- | ------ |
| `REQUESTED_A_SERVICE`         | Change job's name to only include tutors first name and last initial. And set job default location based on description. |
| `ADDED_CONTRACTOR_TO_SERVICE` | Change job's status to in progress, and move pipeline stage on client to matched not booked. |
