// Express 기본 모듈 불러오기
var express = require('express'),
    http = require('http'),
    path = require('path');

// Express의 미들웨어 불러오기
var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    static = require('serve-static'),
    errorHandler = require('errorhandler');

// 에러 핸들러 모듈 사용
var expressErrorHandler = require('express-error-handler');

// Session 미들웨어 불러오기
var expressSession = require('express-session');


//===== MySQL 데이터베이스를 사용할 수 있도록 하는 mysql 모듈 불러오기 =====//
var mysql = require('mysql');

//===== MySQL 데이터베이스 연결 설정 =====//
var options = {
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'dpdltm137',
    database: 'test',
    debug: false
};

var pool = mysql.createPool(options);



// 익스프레스 객체 생성
var app = express();

// 설정 파일에 들어있는 port 정보 사용하여 포트 설정
app.set('port', process.env.PORT || 3000);

// body-parser를 이용해 application/x-www-form-urlencoded 파싱
app.use(bodyParser.urlencoded({
    extended: false
}));

// body-parser를 이용해 application/json 파싱
app.use(bodyParser.json());

// public 폴더를 static으로 오픈
app.use('/html', static(path.join(__dirname, 'html')));

app.use('/pictures', static('pictures'));

// cookie-parser 설정
app.use(cookieParser());

// 세션 설정
app.use(expressSession({
    secret: 'my key',
    resave: true,
    saveUninitialized: true
}));

//===== 라우팅 함수 등록 =====//

// 라우터 객체 참조
var router = express.Router();


// 로그인 처리 함수
router.route('/login').post(function (req, res) {
    console.log('/login 호출됨.');


    // 요청 파라미터 확인
    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;

    console.log('요청 파라미터 : ' + paramId + ', ' + paramPassword);

    // pool 객체가 초기화된 경우, authUser 함수 호출하여 사용자 인증
    if (pool) {
        authMember(paramId, paramPassword, function (err, rows) {

            // 조회된 레코드가 있으면 성공 응답 전송
            if (rows) {
                console.dir(rows);

                // 조회 결과에서 사용자 이름 확인
                req.session.user = {
                    id: paramId
                };

                console.log(req.session.user);
                res.redirect('/html/homelogin.html');
                res.end();

            } else { // 조회된 레코드가 없는 경우 실패 응답 전송
                res.writeHead('200', {
                    'Content-Type': 'text/html;charset=utf8'
                });
                res.write('<h1>로그인  실패</h1>');
                res.write('<div><p>아이디와 패스워드를 다시 확인하십시오.</p></div>');
                res.write("<br><br><a href='/html/login.html'>다시 로그인하기</a>");
                res.end();
            }
        });
    }
});


// 사용자 추가 라우팅 함수
router.route('/addmember').post(function (req, res) {
    console.log('/process/addmember 호출됨.');

    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    var paramName = req.body.name || req.query.name;
    var paramBirth = req.body.birth || req.query.birth;
    var paramPhone = req.body.phone || req.query.phone;
    var paramAddress = req.body.address || req.query.address;



    // pool 객체가 초기화된 경우, addMember 함수 호출하여 사용자 추가
    if (pool) {
        addMember(paramId, paramPassword, paramName, paramBirth, paramPhone, paramAddress, function (err, addedMember) {
            // 동일한 id로 추가하려는 경우 에러 발생 - 클라이언트로 에러 전송
            if (err) {
                console.error('사용자 추가 중 에러 발생 : ' + err.stack);

                res.writeHead('200', {
                    'Content-Type': 'text/html;charset=utf8'
                });
                res.write('<h1>중복된 아이디 입니다!</h1>');
                res.write('<a href="/html/member.html"><h2>다른 아이디 입력하기</h2></a>');
                res.end();
            }

            // 결과 객체 있으면 성공 응답 전송
            if (addedMember) {
                console.dir(addedMember);

                console.log('inserted ' + addedMember.affectedRows + ' rows');

                var insertId = addedMember.insertId;
                console.log('추가한 레코드의 아이디 : ' + insertId);

                res.writeHead('200', {
                    'Content-Type': 'text/html;charset=utf8'
                });
                res.write('<h1>회원 가입을 축하합니다!</h1>');
                res.write('<a href="/html/home.html"><h2>홈으로 가기</h2></a>');
                res.end();
            }
        });
    }
});

// purchase 추가 라우터 함수
router.route('/addpurchase').post(function (req, res) {
    
    if (req.session.user.id === null) {
        res.redirect('/html/login.html');
        res.end();
    } else {

        var paramId = req.session.user.id;
        var paramGId = req.body.gId;

        // pool 객체가 초기화된 경우, addMember 함수 호출하여 사용자 추가
        if (pool) {
            addPurchase(paramId, paramGId, function (err, addedpurchase) {

                // 결과 객체 있으면 성공 응답 전송
                if (addedpurchase) {
                    res.writeHead('200', {
                        'Content-Type': 'text/html;charset=utf8'
                    });
                    res.write('<h1>상품을 주문했습니다!</h1>');
                    res.write('<a href="/html/homelogin.html"><h2>홈으로 가기</h2></a>');
                    res.end();
                }
            });
        }
    }
});

//사용자 제거 라우터 함수
router.route('/delete').post(function (req, res) {


    var paramId = req.session.user.id;

    // pool 객체가 초기화된 경우, authUser 함수 호출하여 사용자 인증
    if (pool) {
        deleteMember(paramId, function (err, rows) {

            req.session.user = {
                id: null,
                isLogin: false
            };

            res.redirect('/html/home.html');
        });
    }
});

// 구매내역 라우터 함수
router.route('/bought').post(function (req, res) {

    // 요청 파라미터 확인
    var paramId = req.session.user.id;

    // pool 객체가 초기화된 경우, authUser 함수 호출하여 사용자 인증
    if (pool) {
        bought(paramId, function (err, rows) {

            // 조회된 레코드가 있으면 성공 응답 전송
            if (rows) {

                res.writeHead('200', {
                    'Content-Type': 'text/html;charset=utf8'
                });
                res.write('<h1>구매 내역</h1><br><hr>');

                for (var i = 0; i < rows.length; i++) {
                    res.write('주문번호 : ' + rows[i].pid + ' 상품명 : ' + rows[i].gname + ' 가격 : ' + rows[i].gprice + ' 배송상태 : ' + rows[i].scode + '<br>');
                    res.write('<form method="post" action="cancle"><input type="text" value="' + rows[i].pid + '" name="pid" style="visibility: hidden"><input type="submit" value="주문취소"></form><br><hr>');
                }
                res.end();

            } else { // 조회된 레코드가 없는 경우 실패 응답 전송
                res.writeHead('200', {
                    'Content-Type': 'text/html;charset=utf8'
                });
                res.write('<h1>주문 내역이 없습니다.</h1>');
                res.write("<br><br><a href='/html/homelogin.html'><h2>홈으로</h2></a>");
                res.end();
            }
        });
    }
});

app.get('/', function(req, res) {
    console.log('test');
    req.session.user = {
        id: null
    };
    res.redirect('/html/home.html');
});

//구매내역 제거 라우터 함수
router.route('/cancle').post(function (req, res) {

    var paramPId = req.body.pid;

    // pool 객체가 초기화된 경우, authUser 함수 호출하여 사용자 인증
    if (pool) {
        deletePurchase(paramPId, function (err, rows) {

            console.log('gd');
            res.writeHead('200', {
                'Content-Type': 'text/html;charset=utf8'
            });
            res.write('<h1>주문 취소 되었습니다.</h1>');
            res.write("<br><br><a href='/html/homelogin.html'>홈으로</a>");
            res.end();
        });
    }
});


// 라우터 객체 등록
app.use('/', router);


// 사용자를 인증하는 함수
var authMember = function (id, password, callback) {
    console.log('authMember 호출됨 : ' + id + ', ' + password);

    // 커넥션 풀에서 연결 객체를 가져옴
    pool.getConnection(function (err, conn) {
        console.log('데이터베이스 연결 스레드 아이디 : ' + conn.threadId);

        var columns = ['id', 'name', 'password'];
        var tablename = 'member';

        // SQL 문을 실행합니다.
        var exec = conn.query("select ?? from ?? where id = ? and password = ?", [columns, tablename, id, password], function (err, rows) {
            conn.release(); // 반드시 해제해야 함
            console.log('실행 대상 SQL : ' + exec.sql);

            if (rows.length > 0) {
                console.log('아이디 [%s], 패스워드 [%s] 가 일치하는 사용자 찾음.', id, password);
                callback(null, rows);
            } else {
                console.log("일치하는 사용자를 찾지 못함.");
                callback(null, null);
            }
        });
    });
}

//사용자를 등록하는 함수
var addMember = function (id, password, name, birth, phone, address, callback) {
    console.log('addUser 호출됨 : ' + id + ', ' + password + ', ' + name + ', ' + birth + ', ' + phone + ', ' + address);

    // 커넥션 풀에서 연결 객체를 가져옴
    pool.getConnection(function (err, conn) {
        console.log('데이터베이스 연결 스레드 아이디 : ' + conn.threadId);

        // 데이터를 객체로 만듦
        var data = {
            id: id,
            password: password,
            name: name,
            birth: birth,
            phone: phone,
            address: address
        };

        // SQL 문을 실행함
        var exec = conn.query('insert into member set ?', data, function (err, result) {
            conn.release(); // 반드시 해제해야 함
            console.log('실행 대상 SQL : ' + exec.sql);

            if (err) {
                console.log('SQL 실행 시 에러 발생함.');
                console.dir(err);

                callback(err, null);
            }

            callback(null, result);

        });
    });
}

//사용자 제거하는 함수
var deleteMember = function (id, callback) {

    // 커넥션 풀에서 연결 객체를 가져옴
    pool.getConnection(function (err, conn) {
        console.log('데이터베이스 연결 스레드 아이디 : ' + conn.threadId);


        // SQL 문을 실행함
        var exec = conn.query('delete from member where id = ?', id, function (err, result) {
            conn.release(); // 반드시 해제해야 함
            console.log('실행 대상 SQL : ' + exec.sql);

            conn.query('delete from purchase where id = ?', id, function (err, result) {});

            if (err) {
                console.log('SQL 실행 시 에러 발생함.');
                console.dir(err);

                callback(err, null);
            }

            callback(null, result);

        });
    });
}

var pId = 0;
//구매추가하는 함수
var addPurchase = function (id, gid, callback) {

    var name;
    var gname, gprice;

    // name, gname, gprice, 구하기
    pool.getConnection(function (err, conn) {

        var columns = ['name'];
        var tablename = 'member';

        // SQL 문을 실행합니다.
        var exec = conn.query("select ?? from ?? where id = ?", [columns, tablename, id], function (err, rows, fields) {
            console.log('name 찾기 실행 대상 SQL : ' + exec.sql);
            conn.release(); // 반드시 해제해야 함
            if (rows.length > 0) {
                console.log('name 찾기 결과 ' + rows[0]);
                name = rows[0].name;

                pool.getConnection(function (err, conn) {
                    var columns = ['gname', 'gprice'];
                    var tablename = 'goods';

                    // SQL 문을 실행합니다.
                    var exec = conn.query("select ?? from ?? where gid = ?", [columns, tablename, gid], function (err, rows, fields) {
                        console.log('gname 찾기 실행 대상 SQL : ' + exec.sql);
                        conn.release(); // 반드시 해제해야 함

                        if (rows.length > 0) {
                            console.log('gname 찾기 결과 ' + rows[0].gname);
                            gname = rows[0].gname;
                            gprice = rows[0].gprice;

                            // 커넥션 풀에서 연결 객체를 가져옴
                            pool.getConnection(function (err, conn) {
                                console.log('데이터베이스 연결 스레드 아이디 : ' + conn.threadId);

                                // 데이터를 객체로 만듦
                                var data = {
                                    pid: pId,
                                    id: id,
                                    gid: gid,
                                    name: name,
                                    gname: gname,
                                    gprice: gprice,
                                    scode: 0
                                };

                                // SQL 문을 실행함
                                var exec = conn.query('insert into purchase set ?', data, function (err, result) {
                                    if (err) {
                                        data.pid++;
                                        pId++;
                                    }

                                    conn.release(); // 반드시 해제해야 함
                                    console.log('실행 대상 SQL : ' + exec.sql);
                                    pId++;

                                    if (err) {
                                        console.log('SQL 실행 시 에러 발생함.');
                                        console.dir(err);

                                        callback(err, null);
                                    }

                                    callback(null, result);

                                });
                            });
                        } else {
                            console.log("일치하는 사용자를 찾지 못함.");
                        }
                    });
                });
            } else {
                console.log("일치하는 사용자를 찾지 못함.");
            }
        });
    });
}

//구매내역 함수
var bought = function (id, callback) {

    // 커넥션 풀에서 연결 객체를 가져옴
    pool.getConnection(function (err, conn) {

        var columns = ['pid', 'gname', 'gprice', 'scode'];
        var tablename = 'purchase';

        // SQL 문을 실행합니다.
        var exec = conn.query("select ?? from ?? where id = ?", [columns, tablename, id], function (err, rows) {
            conn.release(); // 반드시 해제해야 함
            console.log('실행 대상 SQL : ' + exec.sql);

            if (rows.length > 0) {
                callback(null, rows);
            } else {
                console.log("일치하는 사용자를 찾지 못함.");
                callback(null, null);
            }
        });
    });
}

//주문 제거하는 함수
var deletePurchase = function (pid, callback) {

    // 커넥션 풀에서 연결 객체를 가져옴
    pool.getConnection(function (err, conn) {
        console.log('데이터베이스 연결 스레드 아이디 : ' + conn.threadId);


        // SQL 문을 실행함
        var exec = conn.query('delete from purchase where pid = ?', pid, function (err, result) {
            conn.release(); // 반드시 해제해야 함

            if (err) {
                console.log('SQL 실행 시 에러 발생함.');
                console.dir(err);

                callback(err, null);
            }

            callback(null, result);
        });
    });
}

// 404 에러 페이지 처리
var errorHandler = expressErrorHandler({
    static: {
        '404': './html/404.html'
    }
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

//===== 서버 시작 =====//

// 프로세스 종료 시에 데이터베이스 연결 해제
process.on('SIGTERM', function () {
    console.log("프로세스가 종료됩니다.");
});

app.on('close', function () {
    console.log("Express 서버 객체가 종료됩니다.");
});

// Express 서버 시작
http.createServer(app).listen(app.get('port'), function () {
    console.log('서버가 시작되었습니다. 포트 : ' + app.get('port'));
});

router.route('/logout').post(function (req, res) {

    req.session.user = {
        id: null,
        isLogin: false
    };
    console.log(req.session.user);
    res.redirect('/html/home.html');
    res.end();
});