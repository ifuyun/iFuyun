/*global $*/
/**
 * modal component
 * @author fuyun
 * @version 1.0.0
 * @since 1.0.0(2020-07-16)
 */
const popup = require('./dialog');
const htmlTpl = `
    <div class="g-modal-root">
        <div class="g-mask"></div>
        <div class="g-modal-wrap">
            <div class="g-modal">
                <div class="g-modal-content">
                    <div class="g-modal-close">
                        <svg class="g-modal-close-icon" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/>
                            <path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"/>
                        </svg>
                    </div>
                    <div class="g-modal-body">
                    </div>
                </div>
            </div>
        </div>
    </div>`;
module.exports = {
    show: function (opts) {
        const defaults = {
            width: 320, // iPhone SE/5s
            content: ''
        };
        opts = $.extend(true, {}, defaults, opts);
        const $modal = $(htmlTpl);
        $modal.find('.g-modal-body').append(opts.content);
        $modal.find('.g-modal').on('click', function () {
            return false;
        });
        $modal.find('.g-modal-close,.g-modal-wrap,.g-mask').on('click', function () {
            $modal.remove();
            $('body').css('overflow', '');
        });
        if (opts.width !== 'auto' && typeof opts.width !== 'number') {
            opts.width = defaults.width;
        }
        const $body = $('body');
        if (opts.width === 'auto') { // display first
            $modal.find('.g-modal').css('width', defaults.width);
        } else {
            $modal.find('.g-modal').css('width', Math.min(opts.width, $body.width()));
        }
        $('.g-modal-root').remove();
        $body.css('overflow', 'hidden');
        $body.append($modal);
        if (opts.width === 'auto') { // refresh
            const $img = $modal.find('img');
            const refresh = () => {
                const imgWidth = $img.width();
                const bodyWidth = $body.width();
                if (imgWidth > bodyWidth) {
                    $modal.find('img').css('max-width', '100%');
                }
                $modal.find('.g-modal').css('width', Math.min(imgWidth, bodyWidth));
            };
            if ($img.width() > 0) {
                refresh();
            } else {
                let counter = 0;
                const timer = setInterval(function () {
                    const timeOut = 600; // 60s
                    counter += 1;
                    if ($img.width() > 0) {
                        refresh();
                        clearInterval(timer);
                    }
                    if (counter >= timeOut) {
                        clearInterval(timer);
                        $('.g-modal-root').remove();
                        popup.alert('图片加载超时。');
                    }
                }, 100);
            }
        }
    }
};
