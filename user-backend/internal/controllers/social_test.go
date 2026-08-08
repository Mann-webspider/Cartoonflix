package controllers

import "testing"

func TestRoundToOneDecimal(t *testing.T) {
	cases := map[float64]float64{
		4.333333333333333: 4.3,
		4.25:              4.3, // halves round away from zero, not to even
		4.0:               4.0,
		0:                 0,
		5:                 5,
		3.96:              4.0,
		1.04:              1.0,
	}
	for input, want := range cases {
		if got := roundToOneDecimal(input); got != want {
			t.Errorf("roundToOneDecimal(%v) = %v, want %v", input, got, want)
		}
	}
}

func TestReviewLengthCeilingIsEnforceable(t *testing.T) {
	// Guards the constant rather than the handler: the limit exists so one
	// review cannot be used to push megabytes into the free-tier database.
	if maxReviewLength <= 0 || maxReviewLength > 20000 {
		t.Fatalf("maxReviewLength = %d, which is not a sane ceiling", maxReviewLength)
	}
	if reviewPageSize <= 0 || reviewPageSize > 200 {
		t.Fatalf("reviewPageSize = %d, which would make an unbounded read", reviewPageSize)
	}
}
