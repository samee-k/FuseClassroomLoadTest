import csv
import boto3
from datetime import datetime, timedelta

# Initialize the Cognito client
client = boto3.client("cognito-idp", region_name="us-west-2")

def login_user(username, password):
    try:
        print(f"Attempting to log in user: {username}")
        response = client.initiate_auth(
            ClientId="4jocuqjogmsl46ds724gaeu3n4",
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
        return access_token,id_token,refresh_token, exp_timestamp
    except Exception as e:
        print(f"Error logging for {username}: {e}")
        return None, None

# Generate 500 test users and log them in
users = []
for i in range(1, 500):
    email = f"classroom-proctor-load-testing{i:04d}@yopmail.com"  # Sequential emails
    # email = "sachitratnapahari.sa@yopmail.com"  # Sequential emails
    password = "Test@123"  # Same password for all users

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
