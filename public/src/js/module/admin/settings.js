/*global $*/
$(function () {
    $('#form-settings').on('submit', function(e){
        var $that = $(this);
        $.ajax({
            type: 'post',
            url: $that.attr('action'),
            data: $that.serialize(),
            dataType: 'json',
            success: function (d, s, xhr) {
                if(d.code === 0){
                    location.href = d.data.url;
                } else {
                    $('#csrfToken').val(d.token);
                    alert(d.message);
                }
            },
            error: function (xhr, s, err) {
                return false;
            }
        });
        return false;
    });
});