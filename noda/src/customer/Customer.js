import React, { useEffect, useRef, useState } from 'react';
import './style.css'
import '../assets/css/reset.css'
import AddUser from './AddUser';
import ListUser from './ListUser';
import EditUser from './EditUser';
import Message from './Message';
import taxiService from '../services/taxiService';

const Customer = () => {

    const [users,setUsers] = useState([])
    const [current,setCurrent] = useState({})
    const [isEdit,setIsEdit] = useState(false)

    const [msg,setMsg] = useState('')
    const [isShow,setIsShow] = useState(false)


    useEffect(() => {
        onData()
    })

    const onData = async() => {
        const res = await taxiService.getUser()
        setUsers(res)
    }


    const onAdd = (user,image) => {
        taxiService.addUser(user,image)
        onData()
        onShow('명단을 추가합니다')
    }

    const onDel = (id) => {
        taxiService.deleteUser(id)
        onData()
        onShow('명단을 삭제합니다')
    }

    const onEdit = (user) => {
        setIsEdit(true)
        setCurrent(user)
        onShow('명단을 수정합니다')
    }

    const onUpdate = (data) => {
        setIsEdit(false)
        taxiService.updateUser(data)
        onData()
        onShow('명단을 수정했습니다')
    }

    const onShow = (msg) => {
        setMsg(msg)
        setIsShow(true)
    }


    return (
        <div className='Customer'>
            {
                isEdit?<EditUser current={current} onUpdate={onUpdate} setIsEdit={setIsEdit}/>:<AddUser onAdd={onAdd}/>
            }
            <ListUser users={users} onDel={onDel} onEdit={onEdit}/>
            <Message msg={msg} isShow={isShow} setIsShow={setIsShow}/>
        </div>
    );
};

export default Customer;