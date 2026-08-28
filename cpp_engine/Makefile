CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -Iinclude
SRCS = src/models.cpp src/predictors.cpp src/monte_carlo.cpp src/main.cpp
TARGET = horse_predictor.exe

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) $(SRCS) -o $(TARGET)

clean:
	rm -f $(TARGET) *.o
