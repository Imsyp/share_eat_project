// users.js

let users = [
    { id: 1, username: 'user1', password: 'password1' },
    { id: 2, username: 'user2', password: 'password2' }
];

// 사용자 정보 추가 함수
const addUser = (userInfo) => {
    const newUser = { id: users.length + 1, ...userInfo };
    users.push(newUser);
};

module.exports = {
    users: users,
    addUser: addUser
};