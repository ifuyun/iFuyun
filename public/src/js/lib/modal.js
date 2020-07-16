/*global $*/
/**
 * modal component
 * @author fuyun
 * @version 1.0.0
 * @since 1.0.0(2020-07-16)
 */
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
            width: 520,
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
        $('.g-modal-root').remove();
        const $body = $('body');
        $body.css('overflow', 'hidden');
        $body.append($modal);
        if (opts.width === 'auto') {
            const modalWidth = $modal.find('img').width();
            const bodyWidth = $body.width();
            if (modalWidth > bodyWidth) {
                $modal.find('img').css('max-width', '100%');
            }
            $modal.find('.g-modal').css('width', Math.min(modalWidth, bodyWidth));
        } else {
            $modal.find('.g-modal').css('width', Math.min(opts.width, $body.width()));
        }
    }
};
