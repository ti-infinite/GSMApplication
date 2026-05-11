FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

RUN apk add --no-cache icu-libs
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

ARG TARGETARCH
WORKDIR /src

COPY ./*.sln ./
COPY ./NuGet.config* ./
COPY ./Directory.Build.props* ./
COPY ./Directory.Build.targets* ./
COPY ./Directory.Packages.props* ./
COPY ./global.json* ./

COPY ./src/*.csproj ./src/
COPY ./src/GSMApplication.Api/*.csproj ./src/GSMApplication.Api/
COPY ./src/GSMApplication.Entities/*.csproj ./src/GSMApplication.Entities/
COPY ./src/GSMApplication.Abstractions/*.csproj ./src/GSMApplication.Abstractions/
COPY ./src/GSMApplication.Infrastructure/*.csproj ./src/GSMApplication.Infrastructure/
COPY ./src/GSMApplication.Business/*.csproj ./src/GSMApplication.Business/
COPY ./src/GSMApplication.Tenant/*.csproj ./src/GSMApplication.Tenant/
COPY ./src/GSMApplication.DataAccess/*.csproj ./src/GSMApplication.DataAccess/

RUN --mount=type=cache,target=/root/.nuget/packages,id=nuget-packages,sharing=locked \
    --mount=type=cache,target=/root/.local/share/NuGet/v3-cache,id=nuget-v3,sharing=locked \
    case "$TARGETARCH" in \
      "arm64") RID="linux-musl-arm64" ;; \
      "amd64") RID="linux-musl-x64" ;; \
      *) echo "Arquitectura no soportada: $TARGETARCH" && exit 1 ;; \
    esac && \
    dotnet restore ./src/GSMApplication.Api/GSMApplication.Api.csproj -r "$RID" --verbosity minimal

COPY ./src ./src

RUN case "$TARGETARCH" in \
      "arm64") RID="linux-musl-arm64" ;; \
      "amd64") RID="linux-musl-x64" ;; \
      *) echo "Arquitectura no soportada: $TARGETARCH" && exit 1 ;; \
    esac && \
    dotnet publish ./src/GSMApplication.Api/GSMApplication.Api.csproj \
      -c Release \
      -o /app/out \
      -r "$RID" \
      /p:SelfContained=false \
      /p:StripSymbols=true \
      /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache icu-libs wget && adduser -u 1001 -D appuser
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

COPY --from=build /app/out ./
RUN chown -R appuser:appuser /app

USER appuser

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8082
EXPOSE 8082

HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8082/health || exit 1

ENTRYPOINT ["dotnet", "GSMApplication.Api.dll"]