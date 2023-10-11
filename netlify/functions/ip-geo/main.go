package main

import (
	"fmt"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(request events.APIGatewayProxyRequest) (*events.APIGatewayProxyResponse, error) {
	// Your server-side functionality
	fmt.Println("Starging handler")

	// GET メソッド以外はエラー
	if request.HTTPMethod != http.MethodGet {
		return &events.APIGatewayProxyResponse{
			StatusCode: 400,
			Body:       "Bad Request",
		}, nil
	}

	// リクエストパラメータとしてIPアドレスを受け取る
	ipAddress := request.QueryStringParameters["ipAddress"]

	// ipAddress がない場合はエラー
	if ipAddress == "" {
		return &events.APIGatewayProxyResponse{
			StatusCode: 400,
			Body:       "Bad Request",
		}, nil
	}

	return &events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       "Hello, World! Received ip_addr: " + ipAddress,
	}, nil
}

func main() {
	fmt.Println("Starting Lambda Server")
	// Make the handler available for Remote Procedure Call
	lambda.Start(handler)
}
