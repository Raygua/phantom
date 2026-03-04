import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { v4 as uuidv4 } from 'uuid';

export const useUser = () => {
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        let id = Cookies.get('player_user_id');
        if (!id) {
            id = uuidv4();
            Cookies.set('player_user_id', id, { expires: 7 }); 
        }
        setUserId(id);
    }, []);

    return userId;
};