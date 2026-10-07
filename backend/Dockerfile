# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Cache Maven dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy project source and package the application
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create a non-root user and group for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy executable jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose default Spring Boot port
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
