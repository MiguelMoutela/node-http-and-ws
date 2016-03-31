
server-0:
	node app-boot.js
client-0:
	ab -n 1000 -c 10 -q -S -d http://127.0.0.1:8888/ui/index.html | grep "Requests per second"

server:
	node app-boot.js -vvv -s
dump:
	jsonlint app-db.json

client-1:
	curl -s -k -D- https://127.0.0.1:8888/
client-2:
	curl -s -k -D- --http1.1 https://127.0.0.1:8888/ui/
	curl -s -k -D- --http1.1 https://127.0.0.1:8888/ui/index.html
	curl -s -k -D- --http2   https://127.0.0.1:8888/ui/
	curl -s -k -D- --http2   https://127.0.0.1:8888/ui/index.html
client-3:
	curl -s -k -D- -X POST \
		-H "Content-type: application/json" \
		--data '{ "username": "admin", "foo": "bar" }' \
		https://127.0.0.1:8888/sv/login | tee .token; echo ""
	curl -s -k -D- -X POST \
		-H "Content-type: application/json" \
		--data '{ "username": "admin", "password": "WRONG" }' \
		https://127.0.0.1:8888/sv/login | tee .token; echo ""
	curl -s -k -D- -X POST \
		-H "Content-type: application/json" \
		--data '{ "username": "admin", "password": "admin" }' \
		https://127.0.0.1:8888/sv/login | tee .token
client-4:
	curl -s -k -D- https://127.0.0.1:8888/sv/unprotected
client-5:
	curl -s -k -D- https://127.0.0.1:8888/sv/protected; echo ""
	token=`grep 'token' .token | sed -e 's;.*"token":";;' -e 's;".*;;'`; \
	curl -s -k -D- -H "Authorization: jwt $$token" \
		https://127.0.0.1:8888/sv/protected

client-6:
	curl -s -k -D- -X POST \
		-H "Content-type: application/json" \
		--data '{ "foo": 42 }' \
		https://127.0.0.1:8888/sv/ws1; echo ""
	(sleep 1; echo '{ "foo": 42 }'; sleep 1) | wscat -n -c \
		https://127.0.0.1:8888/sv/ws1
client-7:
	(sleep 1; echo '{ "foo": 42 }'; sleep 1) | wscat -n -c \
		https://127.0.0.1:8888/sv/ws2
client-8:
	(sleep 1; echo '{ "foo": 42 }'; sleep 1; echo '{ "bar": 7 }'; sleep 1) | wscat -n -c \
		https://127.0.0.1:8888/sv/ws3

