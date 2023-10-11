package main

import (
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"
	"ip-geo.foresuke.com/handlers"
)

func main() {
	fmt.Println("Starting Lambda Server")
	// Make the handler available for Remote Procedure Call
	lambda.Start(handlers.IPHandler)
}
