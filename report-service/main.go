package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	"report-service/pb"

	"github.com/go-pdf/fpdf"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
)

var actions = []string{"fetch", "upload", "search"}

var barColors = map[string][3]int{
	"fetch":  {59, 130, 246},
	"upload": {16, 185, 129},
	"search": {139, 92, 246},
}

type reportServer struct {
	pb.UnimplementedReportServiceServer
	rdb *redis.Client
}

func (s *reportServer) GenerateReport(
	ctx context.Context,
	req *pb.ReportRequest,
) (*pb.ReportReply, error) {
	from, to := req.GetFromTs(), req.GetToTs()
	if from == 0 && to == 0 {
		to = time.Now().UnixMilli()
		from = to - 24*60*60*1000
	}

	stats := s.collectStats(ctx, from, to)

	pdf, err := buildPDF(stats)
	if err != nil {
		return nil, fmt.Errorf("failed to render pdf: %w", err)
	}

	log.Printf("[report-service] generated report: %v", stats)
	return &pb.ReportReply{Pdf: pdf, Filename: "analytics_report.pdf"}, nil
}

func (s *reportServer) collectStats(ctx context.Context, from, to int64) map[string]int {
	stats := make(map[string]int, len(actions))
	for _, action := range actions {
		key := "action:" + action
		res, err := s.rdb.Do(ctx, "TS.RANGE", key, from, to).Result()
		if err != nil {
			stats[action] = 0
			continue
		}
		if points, ok := res.([]interface{}); ok {
			stats[action] = len(points)
		}
	}
	return stats
}

func buildPDF(stats map[string]int) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	pdf.SetFont("Helvetica", "B", 22)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(0, 14, "System Analytics Report", "", 1, "C", false, 0, "")

	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(100, 116, 139)
	pdf.CellFormat(0, 6, "Generated on: "+time.Now().Format("2006-01-02 15:04:05"),
		"", 1, "C", false, 0, "")
	pdf.Ln(10)

	pdf.SetFont("Helvetica", "B", 14)
	pdf.SetTextColor(15, 23, 42)
	pdf.CellFormat(0, 8, "API Activity Summary (last 24 hours)", "", 1, "L", false, 0, "")
	pdf.Ln(2)

	pdf.SetFont("Helvetica", "", 12)
	pdf.SetTextColor(51, 65, 85)
	pdf.CellFormat(0, 7, fmt.Sprintf("Fetch operations (Service A from DummyJSON): %d", stats["fetch"]), "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 7, fmt.Sprintf("Upload operations (manual file processing): %d", stats["upload"]), "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 7, fmt.Sprintf("Search requests (product queries): %d", stats["search"]), "", 1, "L", false, 0, "")
	pdf.Ln(12)

	pdf.SetFont("Helvetica", "B", 14)
	pdf.SetTextColor(15, 23, 42)
	pdf.CellFormat(0, 8, "Visual Metrics Chart", "", 1, "L", false, 0, "")

	drawBarChart(pdf, stats)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func drawBarChart(pdf *fpdf.Fpdf, stats map[string]int) {
	const (
		baseline     = 210.0
		chartLeft    = 40.0
		barWidth     = 30.0
		gap          = 25.0
		maxBarHeight = 70.0
	)

	maxVal := 1
	for _, action := range actions {
		if stats[action] > maxVal {
			maxVal = stats[action]
		}
	}

	for i, action := range actions {
		val := stats[action]
		height := (float64(val) / float64(maxVal)) * maxBarHeight
		x := chartLeft + float64(i)*(barWidth+gap)
		y := baseline - height

		c := barColors[action]
		pdf.SetFillColor(c[0], c[1], c[2])
		pdf.Rect(x, y, barWidth, height, "F")

		// Value label above the bar.
		pdf.SetFont("Helvetica", "B", 11)
		pdf.SetTextColor(15, 23, 42)
		pdf.SetXY(x, y-7)
		pdf.CellFormat(barWidth, 6, fmt.Sprintf("%d", val), "", 0, "C", false, 0, "")

		// Category label below the baseline.
		pdf.SetFont("Helvetica", "", 10)
		pdf.SetTextColor(100, 116, 139)
		pdf.SetXY(x, baseline+2)
		pdf.CellFormat(barWidth, 6, action, "", 0, "C", false, 0, "")
	}

	// Baseline axis.
	pdf.SetDrawColor(203, 213, 225)
	pdf.SetLineWidth(0.6)
	pdf.Line(chartLeft-10, baseline, chartLeft+float64(len(actions))*(barWidth+gap), baseline)
}

func main() {
	rdb := redis.NewClient(&redis.Options{
		Addr: getenv("REDIS_HOST", "localhost") + ":" + getenv("REDIS_PORT", "6379"),
	})
	defer rdb.Close()

	port := getenv("GRPC_PORT", "50051")
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen on :%s: %v", port, err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterReportServiceServer(grpcServer, &reportServer{rdb: rdb})

	log.Printf("[report-service] gRPC server listening on :%s", port)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
