import csv
import boto3
import os
from datetime import datetime, timedelta
from botocore import UNSIGNED
from botocore.config import Config

# Initialize the Cognito client
COGNITO_REGION = os.getenv("COGNITO_REGION", "us-west-2")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID", "4jocuqjogmsl46ds724gaeu3n4")
USER_PREFIX = os.getenv("USER_PREFIX", "classroom-proctor-load-testing")
USER_DOMAIN = os.getenv("USER_DOMAIN", "yopmail.com")
USER_PASSWORD = os.getenv("USER_PASSWORD", "Test@123")
START_INDEX = int(os.getenv("START_INDEX", "1"))
TOTAL_USERS = int(os.getenv("TOTAL_USERS", "500"))

# InitiateAuth with USER_PASSWORD_AUTH can be called without AWS IAM signing.
# Using unsigned requests avoids EC2 metadata credential lookups on local networks.
client = boto3.client(
    "cognito-idp",
    region_name=COGNITO_REGION,
    config=Config(signature_version=UNSIGNED),
)

def login_user(username, password):
    try:
        print(f"Attempting to log in user: {username}")
        response = client.initiate_auth(
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": username,
                "PASSWORD": password,
            },
        )
        access_token = response["AuthenticationResult"]["AccessToken"]
        id_token = response["AuthenticationResult"]["IdToken"]
        refresh_token = response["AuthenticationResult"]["RefreshToken"]
        expires_in = response["AuthenticationResult"]["ExpiresIn"]  # Expiration time in seconds
        exp_timestamp = int((datetime.now() + timedelta(seconds=expires_in)).timestamp())  # Convert to Unix timestamp
        # print(f"Access {id_token}")
        return access_token, id_token, refresh_token, exp_timestamp
    except Exception as e:
        print(f"Error logging for {username}: {e}")
        return None, None, None, None

# Generate 500 test users and log them in
users = []
for i in range(START_INDEX, START_INDEX + TOTAL_USERS):  # Generate users from START_INDEX to START_INDEX + TOTAL_USERS
    email = f"{USER_PREFIX}{i:04d}@{USER_DOMAIN}"  # Sequential emails
    # email = "sachitratnapahari.sa@yopmail.com"  # Sequential emails
    password = USER_PASSWORD  # Same password for all users

    # Log in the user and get the access token and expiration time
    access_token, id_token, refresh_token, exp_timestamp = login_user(email, password)
    if access_token and id_token and refresh_token and exp_timestamp :
        users.append([email, "bearer "+access_token, id_token, refresh_token, exp_timestamp])  # Store email, access token, and Unix timestamp
    else:
        print(f"Failed to log in user: {email}")

# Write to CSV
try:
    with open('classroom-test-users-token.csv', 'w', newline='') as csvfile:
        csvwriter = csv.writer(csvfile)
        # Write header
        csvwriter.writerow(["email", "access_token", "id_token","refresh_token", "exp"])
        # Write user data
        csvwriter.writerows(users)
    print("CSV file 'classroom-test-users-token.csv' has been generated successfully.")
except Exception as e:
    print(f"Failed to write CSV file: {e}")
