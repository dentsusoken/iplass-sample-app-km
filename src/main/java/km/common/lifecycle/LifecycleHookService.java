/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.lifecycle;

import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.spi.Service;

/**
 * 業務 Command の主処理が完了した後に呼ばれる拡張ポイント。
 */
public interface LifecycleHookService extends Service {

	/** 問合せの起票直後に呼ばれる。 */
	void afterInquiryCreated(EntityManager em, String inquiryOid);

	/** 問合せへの投稿追加など、問合せが更新された後に呼ばれる。 */
	void afterInquirySaved(EntityManager em, String inquiryOid);

	/** ナレッジの作成・更新後に呼ばれる。 */
	void afterKnowledgeSaved(EntityManager em, String knowledgeOid);
}
