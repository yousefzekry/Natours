## Installation

### 1. Clone the repository:
#### To clone the repo:
1)go to the repoository path on github.
2)Click on the green dropdown menu "code". 
3)Click on the download "zip button". 
4)unzip the folder on your machine.
5)open the folder with visual studio code. 
   
#### bash:
git clone https://github.com/yousefzekry/Natours.git

### 2. Install dependencies:
#### open visual studio terminal:
write this command:
npm install
This command installs the project dependencies specified in the package.json file.

#### Set up MongoDB:

Install MongoDB on your local machine or use a cloud-based MongoDB service.
Create a new MongoDB database for the project.

#### Connect MongoDB to the project:

Open the config.env file in the root directory.
Set the MONGODB_URI environment variable to your MongoDB connection string.
Example:
MONGODB_URI=`your_mongodb_connection_string`

These instructions guide users through the process of setting up a MongoDB database, connecting it to the project, and configuring the JWT secret key. 
Make sure to replace the placeholder values (`your_mongodb_connection_string`) with your actual MongoDB connection string.


#### Set up JWT secret key:

Generate a secure secret key for JWT authentication.
Add the JWT_SECRET environment variable to the config.env file
Example:
JWT_SECRET=`your_jwt_secret_key`
Make sure to replace the placeholder values ( `your_jwt_secret_key`) with your actual secure secret key for JWT authentication.
#### command to run the application:
npm start
This command starts the Node.js server and runs the Natours application.

### 3. Use the API:
-you can implement the front end for this api and use it for your own project.
-you can test this api by postman and atlas compass.
-feel free to edit the Api as you like depending on your application features.
