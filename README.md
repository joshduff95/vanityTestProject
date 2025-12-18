# vanityTestProject

## Overview
This project uses amazon connect and aws lambda to create vanity numbers based on the phone number of the person who called. When the number(+1 520-657-1316) is called the phone number gets sent to a lambda that verifies the phone number and generates vanity numbers based on the incoming number. It then sends the top 5 or if theres less to a dynamoDB to be stores and then sends the top 3 back to the caller to be read out loud.

