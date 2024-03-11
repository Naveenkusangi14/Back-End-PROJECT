class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ){
        super(message);
        this.statusCode = statusCode;
        this.data = null; // Additional data related to the error, can be set later.
        this.message = message;
        this.success = false; // Indicates that the operation was not successful.
        this.errors = errors; // Array to hold detailed error messages.

        // If a stack trace is provided, set it. Otherwise, capture the stack trace.
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };