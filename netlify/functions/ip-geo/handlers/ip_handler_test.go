package handlers

import (
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

func TestIPHandler(t *testing.T) {
	testCases := []struct {
		name       string
		request    events.APIGatewayProxyRequest
		statusCode int
		body       string
	}{
		{
			name: "Correct request",
			request: events.APIGatewayProxyRequest{
				HTTPMethod: "GET",
				QueryStringParameters: map[string]string{
					"ipAddress": "192.168.0.1",
				},
			},
			statusCode: 200,
			body:       "Hello, World! Received ip_addr: 192.168.0.1",
		},
		{
			name: "Missing IP address",
			request: events.APIGatewayProxyRequest{
				HTTPMethod:            "GET",
				QueryStringParameters: map[string]string{},
			},
			statusCode: 400,
			body:       "Bad Request",
		},
		{
			name: "POST request",
			request: events.APIGatewayProxyRequest{
				HTTPMethod: "POST",
				QueryStringParameters: map[string]string{
					"ipAddress": "192.168.0.1",
				},
			},
			statusCode: 400,
			body:       "Bad Request",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// handler 関数を呼び出す
			response, err := IPHandler(tc.request)

			// エラーがある場合はテスト失敗
			if err != nil {
				t.Errorf("handler returned an error: %v", err)
			}

			// ステータスコードが正しいかどうかを確認する
			if response.StatusCode != tc.statusCode {
				t.Errorf("handler returned wrong status code: got %v want %v",
					response.StatusCode, tc.statusCode)
			}

			// レスポンスのボディが正しいかどうかを確認する
			if response.Body != tc.body {
				t.Errorf("handler returned unexpected body: got %v want %v",
					response.Body, tc.body)
			}
		})
	}
}
