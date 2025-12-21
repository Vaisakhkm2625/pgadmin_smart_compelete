can you create a smart autocomplete browser extention for pgadmin?

i have a docker with pgadmin installation and pgvector extension installed.
check the sample_docker-compose.yml file for more details

first can you create a python script to enable the pgvector extension in the docker container and create a table for the autocomplete feature. get user command history from the same pgadmin installation and sent it to the openai api emudding api and store the response in the vector table. 

Then create a api endpoint for user to submit recent few queries and the query currently typing. using that do a vector table similarity search. take the search result and sent it to the open ai to predict what user is trying to type.
return it as json response.

use python for creating the project. use venv for virtual environment. use fastapi for creating the api endpoint. use openai for emudding api.

first can you generate a very detailed design-document for the project? 