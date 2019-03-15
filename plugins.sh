#!/bin/sh

cd plugins

directories=`ls -xm`

IFS=', ' read -r -a array <<< $directories

len="${#array[@]}"

for i in "${!array[@]}"
do
    let "cur = $i + 1"
    echo "[$cur/$len] Start install plugin: ${array[i]}"
    cd ${array[i]}
    npm install
    cd ..
done