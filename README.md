How to run the app for beginners

1. click bottom left corner of the screen
2. build the container with docker
3. after the build is succesful open another terminal so you have two showing
4. in one terminal type cargo run to start the backend api
5. in the other terminal type cd frontend and then npm start to start the frontend

update after changes

1. docker-compose up --build -d

test

1. docker-compose run --rm backend_test cargo test --test backend_tests