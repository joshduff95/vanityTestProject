## Test Cases
- To Test run on AWS console in the lambda under test

1. Input
{
  "phoneNumber": "3153492886"
}

Result should be a list of 3 vanity numbers

2. Input 

{
  "phoneNumber": "3155065673"
}

Result should be a single vanity number

3. Input

{
  "phoneNumber": "3155065684"
}

Result of 0 vanity numbers

4. Input

{
  "phoneNumber": "315506"
}

Result invalid phone number
