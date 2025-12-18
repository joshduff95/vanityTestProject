# vanityTestProject

## Overview
This project uses amazon connect and aws lambda to create vanity numbers based on the phone number of the person who called. When the number(+1 520-657-1316) is called the phone number gets sent to a lambda that verifies the phone number and generates vanity numbers based on the incoming number. It then sends the top 5 or if theres less to a dynamoDB to be stores and then sends the top 3 back to the caller to be read out loud.

## Tech Stack
- AWS Lambda (Node.js 24)
- Amazon Connect
- DynamoDB


## How It Works
1. User calls (+1 520-657-1316)
2. Amazon connect prompt saying we will be getting their vanity numbers
3. Callers phone number is sent to a AWS Lambda
4. Number is checked to verify format
5. Words in a dictionary are compared to the letters the callers digit create
6. The create dictionary words are scored based on length of words or if there is multiple
7. Top 5 scores are sent to a dynamoDB
8. Top 3 scores are sent back to the amazon connect flow to be read back to the caller
9. Agent ends call

## Questions
1. Record your reasons for implementing the solution the way you did, struggles you faced and problems you overcame.
- First reason i choose this solution was the problem I was facing with how many words can be created using the digits on a phone number. Thats why i created a dictionary to be referenced when creating the words. If i didn't the number of possibilities of letter combinations for words are to many it would never get through the lambda. So i created a list of common vanity words to be looked at, this can be expanded for more possibilities
- Next reason was it was a efficient way to just to get a number and quickly create, score and store the vanity words so i can get it back to the user with almost 0 delay. I also only send back complete words so it is not just letters being said to the caller, but do to this some callers will not receive a vanity number if there digits don't form a word in the dictionary.

2. What shortcuts did you take that would be a bad practice in production?
- I just created the lambda and dynamoDB in the AWS console instead of creating a CDK or using cloud formation. The reason this is bad is in more complex applications it is harder for someone to recreate this. Where if i used those options they could just deploy it to use.

3. What would you have done with more time? We know you have a life.
- I would create a mor complex dictionary so we can find more vanity options for words.
- Create different options for when the caller calls in case they don't like the options that are given
