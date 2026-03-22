# CrewAI Agent Service (Python)

FROM python:3.11-slim
WORKDIR /crew
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
CMD ["tail", "-f", "/dev/null"]
