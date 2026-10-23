FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
# Small instances (Render free/starter): serial GC, heap sized from the container, fast JIT warm-up.
# On a bigger paid instance, override JAVA_TOOL_OPTIONS (e.g. drop -XX:TieredStopAtLevel=1 for peak throughput).
ENV JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -XX:MaxRAMPercentage=75 -XX:TieredStopAtLevel=1 -Xss512k"
COPY --from=build /app/target/profa-backend-2.0.0.jar /tmp/app.jar
# Unpacked layout + Class Data Sharing archive: the JVM starts noticeably faster (cold starts after sleep).
RUN java -Djarmode=tools -jar /tmp/app.jar extract --destination /app && rm /tmp/app.jar
# Training run without database: the context starts and exits right after refresh.
# If it ever fails, the build continues and the app simply starts without the archive.
RUN java -XX:ArchiveClassesAtExit=app.jsa -Dspring.context.exit=onRefresh \
      -Dspring.flyway.enabled=false -Dspring.jpa.hibernate.ddl-auto=none \
      -Dspring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect \
      -Dspring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false \
      -Dspring.datasource.url=jdbc:postgresql://localhost:1/none \
      -jar app.jar || echo "CDS training skipped"
EXPOSE 8080
ENTRYPOINT ["java","-XX:SharedArchiveFile=app.jsa","-Xshare:auto","-jar","app.jar"]
