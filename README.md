run the app

1. chmod +x run-docker.sh (should only need to do this once)
2. ./run-docker.sh (runs the app)

or 

1. docker-compose up --build (runs the app)
2. docker-compose down (stops the app) or ctrl+c

test

1. chmod +x run-tests.sh (should only need to do this once)
2. ./run-tests.sh (runs the tests)

search database

1. docker exec -it project-db-1 psql -U username -d my_database
2. \d (lists tables)
3. \d polls (shows columns in polls table)
    -SELECT * FROM polls; (shows all rows in polls table)
4. \d voters (shows columns in voters table)
    -SELECT * FROM voters; (shows all rows in voters table)

