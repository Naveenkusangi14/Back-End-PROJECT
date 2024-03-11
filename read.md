# TWO IMPORTANT POINTS ABOUT DATABASE CONNECTIVITY:
 1. When we connect to Database , handling potentaial data-not-found scenorios is essential: Use try/catch or promises to manages errors
 2. Database operation invovle latency , traditional sync code can lead blocing . where the program waits for database for database query to complete before moving  so we can should use async / await which allow non-blocking execution.


# key TO remember :
Databse is in anthore continent so we can use async/ await 

# Logic building | Register controller
 STEPS
    Step:1 - Get User detail from front-end 
    Step:2 - validation - not empty
    Step:3 - Check if user already exist:username,email
    Step:4 - Check for image and avator
    Step:5 - upload them to cloudinary
    Step:6 - create user object - create entry in db
    Step:7 - validation remove password and refresh token field from response
    Step:8 - check for user creation
    Step:9 - return res