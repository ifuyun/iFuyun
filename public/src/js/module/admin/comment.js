/*global $*/
$(() => {
    // 评论列表
    function sendAction(action, commentId) {
        $.ajax({
            type: 'post',
            url: '/admin/comment/status',
            data: {
                action: action,
                commentId: commentId
            },
            headers: {
                'X-CSRF-Token': $('#csrfToken').val()
            },
            dataType: 'json',
            success: (d) => {
                if (d.code === 0) {
                    window.location.reload();
                } else {
                    alert(d.message);
                }
            },
            error: () => false
        });
    }

    $('.btn-approve').on('click', () => {
        sendAction('approve', $(this).attr('data-id'));
        return false;
    });
    $('.btn-reject').on('click', () => {
        sendAction('reject', $(this).attr('data-id'));
        return false;
    });
    $('.btn-spam').on('click', () => {
        sendAction('spam', $(this).attr('data-id'));
        return false;
    });
    $('.btn-delete').on('click', () => {
        sendAction('delete', $(this).attr('data-id'));
        return false;
    });

    // 评论表单
    $('.j-focus:first').focus();
    $('#form-comment').on('submit', () => {
        const $that = $(this);
        $.ajax({
            type: 'post',
            url: $that.attr('action'),
            data: $that.serialize(),
            dataType: 'json',
            success: (d) => {
                if (d.code === 0) {
                    location.href = d.data.url;
                } else {
                    $('#csrfToken').val(d.token);
                    alert(d.message);
                }
            },
            error: () => {
                return false;
            }
        });
        return false;
    });
});

module.exports = () => {
};
