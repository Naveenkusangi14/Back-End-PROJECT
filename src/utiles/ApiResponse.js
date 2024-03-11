class ApiResponse {
   
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode; // The HTTP status code of the response.
        this.data = data; // The data to be sent in the response.
        this.message = message; // The message indicating the result of the operation.
        this.success = statusCode < 400; // Indicates if the operation was successful based on status code.
    }
}

export { ApiResponse };