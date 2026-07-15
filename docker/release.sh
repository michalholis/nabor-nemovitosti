#!/bin/bash

if [ $# -eq 0 ]
  then
    echo "No arguments supplied. One argument with version is required."
    exit 1
fi

rm -rf /tmp/nn
mkdir /tmp/nn
mkdir /tmp/nn/web-app

cp Dockerfile /tmp/nn
cp -r ../src/* /tmp/nn/web-app

cd /tmp/nn

docker build -t michalholis/nn:$1 -t michalholis/nn:latest ./

docker push michalholis/nn:$1
docker push michalholis/nn:latest
